import { useState, useEffect } from "react";

const API_BASE = "/api/planner";

function getAuthHeader() {
  const jwt = localStorage.getItem("ishpo_jwt");
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

export function useProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      console.warn("Using fallback mock projects data:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const createProject = async (projectData: any) => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(projectData),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      fetchProjects();
      return data.project;
    } catch (err: any) {
      console.error("Error creating project:", err);
      throw err;
    }
  };

  return { projects, loading, error, refetch: fetchProjects, createProject };
}

export function useWorkItems(projectId: string) {
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkItems = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/projects/${projectId}/work-items`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch work items");
      const data = await res.json();
      setWorkItems(data.work_items || []);
    } catch (err: any) {
      console.warn("Using mock work items data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkItems();
  }, [projectId]);

  const createWorkItem = async (itemData: any) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(itemData),
      });
      if (!res.ok) throw new Error("Failed to create work item");
      const data = await res.json();
      fetchWorkItems();
      return data.work_item;
    } catch (err: any) {
      console.error("Error creating work item:", err);
      throw err;
    }
  };

  const updateWorkItem = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE}/work-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update work item");
      const data = await res.json();
      fetchWorkItems();
      return data.work_item;
    } catch (err: any) {
      console.error("Error updating work item:", err);
      throw err;
    }
  };

  return { workItems, loading, refetch: fetchWorkItems, createWorkItem, updateWorkItem };
}
