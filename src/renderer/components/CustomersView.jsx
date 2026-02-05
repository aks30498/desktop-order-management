import { useEffect, useState } from "react";
import Helpers from "@/utils/helpers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandList, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";

import { Loader2, User, Save, RotateCcw } from "lucide-react";

export default function CustomersView() {
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---------------------------
  // Search (debounced)
  // ---------------------------
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await Helpers.ipcInvoke("search-customers", query);

        if (res?.success) setResults(res.customers || []);
        else setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // ---------------------------
  // Selection
  // ---------------------------
  function selectCustomer(customer) {
    setSelected(customer);
    setForm({ ...customer });
    setResults([]);
    setQuery("");
  }

  // ---------------------------
  // Form helpers
  // ---------------------------
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const hasChanges =
    selected && JSON.stringify(selected) !== JSON.stringify(form);

  // ---------------------------
  // Save
  // ---------------------------
  async function save() {
    try {
      setSaving(true);

      const res = await Helpers.ipcInvoke("update-customer", form);

      if (!res.success) throw new Error(res.error);

      toast({
        title: "Customer updated successfully",
      });

      setSelected(form);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to save customer",
      });
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <User size={20} />
          Customers
        </h1>
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
              placeholder="Search name or contact..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {loading && (
              <Loader2 className="absolute right-3 top-2 h-4 w-4 animate-spin text-muted-foreground" />
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
            <CardTitle>
              Customer Details
              <span className="ml-2 text-xs text-muted-foreground">
                ID #{form.id}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 max-w-xl">
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
              <Button
                onClick={save}
                disabled={saving || !hasChanges}
                className="gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                <Save size={14} />
                Save
              </Button>

              <Button
                variant="secondary"
                onClick={() => setForm(selected)}
                className="gap-2"
              >
                <RotateCcw size={14} />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!form && (
        <div className="text-sm text-muted-foreground">
          Search and select a customer to view details.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
