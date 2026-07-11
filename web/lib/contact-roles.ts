// Contact roles — mirrors the comment on contacts.role in the schema.
export const CONTACT_ROLES = ["owner", "seller", "broker", "advisor", "other"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];
