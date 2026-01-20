"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type OrganizationWithRole = Doc<"organizations"> & {
  userRole: string;
  userId: Id<"users">;
};

interface OrganizationSwitcherProps {
  workosUserId: string;
  currentOrganizationId?: string;
  onOrganizationChange?: (orgId: string) => void;
}

export function OrganizationSwitcher({
  workosUserId,
  currentOrganizationId,
  onOrganizationChange,
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const organizations = useQuery(api.organizations.listUserOrganizations, {
    workosUserId,
  }) as OrganizationWithRole[] | undefined;

  const createOrganization = useMutation(api.organizations.createOrganization);

  // Find current organization from list
  const currentOrg = organizations?.find(
    (org) => org._id === currentOrganizationId
  );

  // Derive slug from name (unless user manually overrides)
  const derivedSlug = newOrgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const newOrgSlug = slugOverride ?? derivedSlug;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;

    const orgId = await createOrganization({
      name: newOrgName.trim(),
      slug: newOrgSlug.trim(),
    });

    setNewOrgName("");
    setSlugOverride(null);
    setIsCreating(false);
    setIsOpen(false);

    if (onOrganizationChange) {
      onOrganizationChange(orgId);
    }
  };

  const handleSelectOrg = (orgId: Id<"organizations">) => {
    setIsOpen(false);
    if (onOrganizationChange && orgId !== currentOrganizationId) {
      onOrganizationChange(orgId);
    }
  };

  if (!organizations) {
    return (
      <div className="h-9 w-40 animate-pulse rounded-md bg-gray-100" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        <span className="max-w-[150px] truncate">
          {currentOrg?.name ?? "Select Organization"}
        </span>
        <svg
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border bg-white shadow-lg">
          {!isCreating ? (
            <>
              <div className="max-h-60 overflow-y-auto p-1">
                {organizations.map((org) => (
                  <button
                    key={org._id}
                    type="button"
                    onClick={() => handleSelectOrg(org._id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100",
                      org._id === currentOrganizationId &&
                        "bg-gray-100 font-medium"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-200 text-xs font-semibold uppercase">
                      {org.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="truncate">{org.name}</div>
                      <div className="truncate text-xs text-gray-500">
                        {org.userRole}
                      </div>
                    </div>
                    {org._id === currentOrganizationId && (
                      <svg
                        className="h-4 w-4 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create organization
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateOrg} className="p-3">
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Organization name
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Organization"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Slug
                </label>
                <input
                  type="text"
                  value={newOrgSlug}
                  onChange={(e) => setSlugOverride(e.target.value)}
                  placeholder="my-organization"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewOrgName("");
                    setSlugOverride(null);
                  }}
                  className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newOrgName.trim() || !newOrgSlug.trim()}
                  className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
