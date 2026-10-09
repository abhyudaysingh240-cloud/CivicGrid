import math
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from backend.app.models.models import CitizenReport, IncidentCluster

SPATIAL_DISTANCE_THRESHOLD = 50.0  # Twin-space coordinate units
TEXT_SIMILARITY_THRESHOLD = 0.85   # Cosine similarity threshold

def calculate_euclidean_distance(x1: float, y1: float, x2: float, y2: float) -> float:
    return math.sqrt((x1 - x2)**2 + (y1 - y2)**2)

def compute_tfidf_similarity(text1: str, text2: str) -> float:
    """
    Computes TF-IDF cosine similarity between two report text descriptions.
    """
    if text1.strip() == text2.strip():
        return 1.0
        
    try:
        vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), use_idf=False)
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        sim_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        return float(sim_matrix[0][0])
    except Exception:
        tokens1 = set(text1.lower().split())
        tokens2 = set(text2.lower().split())
        if not tokens1 or not tokens2:
            return 0.0
        return len(tokens1.intersection(tokens2)) / len(tokens1.union(tokens2))

class CivicClusteringEngine:
    @staticmethod
    def evaluate_and_cluster_report(
        db: Session,
        new_report: CitizenReport
    ) -> Optional[IncidentCluster]:
        """
        Evaluates existing open reports and clusters.
        Condition: (same asset OR twin-space distance <= 50 units) AND text similarity >= 0.85.
        """
        # Look for open reports in same department from past 7 days
        recent_reports = db.query(CitizenReport).filter(
            CitizenReport.id != new_report.id,
            CitizenReport.department_id == new_report.department_id,
            CitizenReport.status.in_(["SUBMITTED", "VERIFIED", "IN_PROGRESS"])
        ).all()

        target_cluster: Optional[IncidentCluster] = None
        matched_report: Optional[CitizenReport] = None
        highest_sim = 0.0
        dist_used = 0.0

        for existing in recent_reports:
            # Check spatial condition: same asset OR distance <= 50
            same_asset = (new_report.asset_id is not None and new_report.asset_id == existing.asset_id)
            distance = calculate_euclidean_distance(
                new_report.x_coord, new_report.y_coord,
                existing.x_coord, existing.y_coord
            )
            spatial_match = same_asset or (distance <= SPATIAL_DISTANCE_THRESHOLD)

            if not spatial_match:
                continue

            # Check semantic condition: text similarity >= 0.85
            sim = compute_tfidf_similarity(new_report.description, existing.description)
            if sim >= TEXT_SIMILARITY_THRESHOLD and sim > highest_sim:
                highest_sim = sim
                dist_used = distance
                matched_report = existing
                if existing.cluster_id:
                    target_cluster = db.query(IncidentCluster).filter(IncidentCluster.id == existing.cluster_id).first()

        if matched_report:
            if not target_cluster:
                # Create a new incident cluster
                cluster_title = f"Clustered Incident: {new_report.category.capitalize()} near {new_report.asset.name if new_report.asset else 'Twin Coordinate'}"
                target_cluster = IncidentCluster(
                    asset_id=new_report.asset_id or matched_report.asset_id,
                    department_id=new_report.department_id,
                    title=cluster_title,
                    report_count=2,
                    status="OPEN",
                    priority_score=max(new_report.priority_score, matched_report.priority_score),
                    explanation_json={
                        "rule": "(same asset OR dist <= 50) AND similarity >= 0.85",
                        "pairwise_matches": [
                            {
                                "report_a_id": matched_report.id,
                                "report_b_id": new_report.id,
                                "similarity": round(highest_sim, 3),
                                "spatial_distance": round(dist_used, 1),
                                "method": "TF-IDF Cosine Similarity"
                            }
                        ]
                    }
                )
                db.add(target_cluster)
                db.commit()
                db.refresh(target_cluster)

                matched_report.cluster_id = target_cluster.id
            else:
                # Add to existing cluster
                target_cluster.report_count += 1
                explanation = target_cluster.explanation_json or {"pairwise_matches": []}
                matches = explanation.get("pairwise_matches", [])
                matches.append({
                    "report_a_id": matched_report.id,
                    "report_b_id": new_report.id,
                    "similarity": round(highest_sim, 3),
                    "spatial_distance": round(dist_used, 1),
                    "method": "TF-IDF Cosine Similarity"
                })
                target_cluster.explanation_json = explanation
                db.commit()

            new_report.cluster_id = target_cluster.id
            db.commit()
            return target_cluster

        return None
