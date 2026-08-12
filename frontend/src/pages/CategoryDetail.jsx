import { useParams, Navigate } from "react-router-dom";

export default function CategoryDetail() {
  const { categoryId } = useParams();
  return <Navigate to={`/room/${categoryId}`} replace />;
}
