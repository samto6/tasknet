"use client";

import { useEffect } from "react";
import { sanitizeSupabaseStorage } from "@/lib/supabase/cleanup";

export default function StorageCleanup() {
  useEffect(() => {
    sanitizeSupabaseStorage();
  }, []);

  return null;
}
