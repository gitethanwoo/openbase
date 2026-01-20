"use client";

import { useState, useCallback } from "react";

interface LeadCaptureField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface LeadCaptureConfig {
  enabled: boolean;
  triggerMode: string;
  triggerAfterMessages?: number;
  title: string;
  description?: string;
  fields: LeadCaptureField[];
  submitButtonText: string;
  successMessage: string;
}

interface LeadCaptureFormProps {
  config: LeadCaptureConfig;
  organizationId: string;
  agentId: string;
  conversationId?: string | null;
  primaryColor: string;
  onSubmitSuccess: () => void;
  onSkip?: () => void;
}

export function LeadCaptureForm({
  config,
  organizationId,
  agentId,
  conversationId,
  primaryColor,
  onSubmitSuccess,
  onSkip,
}: LeadCaptureFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = useCallback(
    (fieldId: string, value: string) => {
      setFormData((prev) => ({ ...prev, [fieldId]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validate required fields
      for (const field of config.fields) {
        if (field.required && !formData[field.id]?.trim()) {
          setError(`${field.label} is required`);
          return;
        }
      }

      setIsSubmitting(true);

      try {
        // Extract standard fields and custom fields
        const name = formData["name"];
        const email = formData["email"];
        const phone = formData["phone"];

        // Everything else is a custom field
        const customFields: Record<string, string> = {};
        for (const [key, value] of Object.entries(formData)) {
          if (key !== "name" && key !== "email" && key !== "phone" && value) {
            customFields[key] = value;
          }
        }

        const response = await fetch("/api/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId,
            agentId,
            conversationId: conversationId || undefined,
            name: name || undefined,
            email: email || undefined,
            phone: phone || undefined,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit");
        }

        setShowSuccess(true);
        setTimeout(() => {
          onSubmitSuccess();
        }, 2000);
      } catch (err) {
        console.error("[LeadCaptureForm] Error submitting:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, config.fields, organizationId, agentId, conversationId, onSubmitSuccess]
  );

  if (showSuccess) {
    return (
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: "#1f2937", fontSize: "14px", margin: 0 }}>
          {config.successMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#f9fafb",
        borderRadius: "8px",
        margin: "12px",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          fontWeight: "600",
          color: "#1f2937",
          marginBottom: "8px",
          marginTop: 0,
        }}
      >
        {config.title}
      </h3>
      {config.description && (
        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            marginBottom: "16px",
            marginTop: 0,
          }}
        >
          {config.description}
        </p>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {config.fields.map((field) => (
            <div key={field.id}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "4px",
                }}
              >
                {field.label}
                {field.required && (
                  <span style={{ color: "#dc2626", marginLeft: "2px" }}>*</span>
                )}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              ) : field.type === "select" ? (
                <select
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  required={field.required}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    backgroundColor: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: isSubmitting ? "#9ca3af" : primaryColor,
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isSubmitting ? "Submitting..." : config.submitButtonText}
          </button>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isSubmitting}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                backgroundColor: "#ffffff",
                color: "#6b7280",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Skip
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
