"use client";

import React from "react";
import { TableJsonTag } from "@/lib/table-tag";
import { OrderDetailsInspectorModal } from "@/components/admin/OrderDetailsInspectorModal";

interface JsonTagInspectorModalProps {
  tag: TableJsonTag;
  onClose: () => void;
}

export const JsonTagInspectorModal: React.FC<JsonTagInspectorModalProps> = ({ tag, onClose }) => {
  return <OrderDetailsInspectorModal tag={tag} onClose={onClose} />;
};
