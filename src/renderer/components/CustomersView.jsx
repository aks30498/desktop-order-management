import { useEffect, useState } from "react";
import Helpers from "@/utils/helpers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandList, CommandItem } from "@/components/ui/command";

export default function CustomersView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // --------------------
  // Search customers (debounced)
  // --------------------
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await Helpers.ipcInvoke("search-customers", query);
        setResults(result || []);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // --------------------
  // Selection
  // --------------------
  const selectCustomer = (customer) => {
    setSelected(customer);
    setForm(customer);
    setResults([]);
    setQuery("");
  };

  // --------------------
  // Editing
  // --------------------
  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    try {
      setSaving(true);

      // TODO: Implement IPC later
      console.log("Saving customer:", form);
      await Helpers.delay(500);

      notifications.success("Customer saved");
      setSelected(form);
    } catch {
      notifications.error("Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  // --------------------
  // Render
  // --------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">
          Search and manage customer records
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Customer</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative max-w-md">
            <Input
              placeholder="Search by name or contact..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {loading && (
              <div className="absolute right-3 top-2 text-xs text-muted-foreground">
                Searching...
              </div>
            )}

            {results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow">
                <Command>
                  <CommandList>
                    {results.map((c) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => selectCustomer(c)}
                        className="flex justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.contact}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      {form && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 max-w-xl">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>

            <Field label="Contact">
              <Input
                value={form.contact}
                onChange={(e) => update("contact", e.target.value)}
              />
            </Field>

            <Field label="Alternate Contact">
              <Input
                value={form.alternate_contact || ""}
                onChange={(e) => update("alternate_contact", e.target.value)}
              />
            </Field>

            <Field label="Address">
              <Input
                value={form.address || ""}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>

              <Button variant="secondary" onClick={() => setForm(selected)}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --------------------
function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
