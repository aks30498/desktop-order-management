import { useEffect, useRef, useState } from "react";
import Helpers from "@/utils/helpers";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Command, CommandList, CommandItem } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

import { X, Loader2 } from "lucide-react";

const initialForm = {
  customerName: "",
  phoneNumber: "",
  orderDate: "",
  orderTime: "",
  weight: "",
  address: "",
  orderNotes: "",
};

export default function OrderFormView({ onOrderCreated }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePath, setSelectedImagePath] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef();

  // --------------------
  // Customer autocomplete state
  // --------------------
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // --------------------
  // Initialize date + time
  // --------------------
  useEffect(() => {
    setForm((f) => ({
      ...f,
      orderDate: Helpers.getCurrentDate(),
      orderTime: Helpers.getCurrentTime(),
    }));
  }, []);

  // --------------------
  // Debounced customer search
  // --------------------
  useEffect(() => {
    if (!customerQuery.trim() || selectedCustomer) {
      setCustomerSuggestions([]);
      setIsPopoverOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const result = await Helpers.ipcInvoke(
          "search-customers",
          customerQuery,
        );
        const suggestions = result || [];
        setCustomerSuggestions(suggestions);
        setIsPopoverOpen(suggestions.length > 0);
      } catch (err) {
        console.error("Customer search failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400); // Reduced delay for better UX

    return () => clearTimeout(timer);
  }, [customerQuery, selectedCustomer]);

  // --------------------
  // Helpers
  // --------------------
  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onClose = () => {
    navigate("/");
  };

  // --------------------
  // Customer selection
  // --------------------
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSuggestions([]);
    setCustomerQuery("");
    setIsPopoverOpen(false);

    update("customerName", customer.name);
    update("phoneNumber", customer.contact);
    update("address", customer.address ?? "");
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSuggestions([]);
    setCustomerQuery("");
    setIsPopoverOpen(false);

    update("customerName", "");
    update("phoneNumber", "");
    update("address", "");
  };

  // --------------------
  // Image handling
  // --------------------
  const handleFile = async (file) => {
    if (!Helpers.validateImage(file)) {
      toast({ variant: "destructive", title: "Invalid image file" });
      return;
    }
    const resized = await Helpers.resizeImage(file);
    const dataUrl = await Helpers.blobToBase64(resized);
    setSelectedImage(resized);
    setSelectedImagePath(null);
    setPreviewUrl(dataUrl);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = [...e.dataTransfer.files].find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) await handleFile(file);
  };

  const selectFromSystem = async () => {
    try {
      const result = await Helpers.ipcInvoke("select-image");
      if (result.success) {
        setSelectedImage(null);
        setSelectedImagePath(result.filePath);
        setPreviewUrl(`file://${result.filePath}`);
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to select image" });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImagePath(null);
    setPreviewUrl(null);
  };

  // --------------------
  // Submit logic (Validation + IPC)
  // --------------------
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Basic Validation
    const next = {};
    if (!form.customerName) next.customerName = "Required";
    if (!form.phoneNumber) next.phoneNumber = "Required";
    if (!form.orderDate) next.orderDate = "Required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setIsSubmitting(true);
      let imagePath = null;

      if (selectedImage) {
        const data = await Helpers.blobToBase64(selectedImage);
        const result = await Helpers.ipcInvoke("save-image", data, null);
        imagePath = result.imagePath;
      } else if (selectedImagePath) {
        const result = await Helpers.ipcInvoke(
          "save-image",
          selectedImagePath,
          null,
        );
        imagePath = result.imagePath;
      }

      const payload = {
        customerId: selectedCustomer?.id ?? null,
        customer: selectedCustomer
          ? null
          : {
              name: form.customerName,
              contact: form.phoneNumber,
              address: form.address,
            },
        orderDate: form.orderDate,
        orderTime: form.orderTime,
        weight: form.weight,
        imagePath,
        orderNotes: form.orderNotes,
      };

      const result = await Helpers.ipcInvoke("add-order", payload);
      if (!result.success) throw new Error(result.error);

      toast({ title: "Order added successfully" });
      onOrderCreated?.();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to add order" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Order</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Customer Name Search */}
          <Field label="Customer Name *" error={errors.customerName}>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    value={form.customerName}
                    placeholder="Start typing customer name..."
                    disabled={!!selectedCustomer}
                    onChange={(e) => {
                      update("customerName", e.target.value);
                      setCustomerQuery(e.target.value);
                    }}
                    onFocus={() =>
                      customerSuggestions.length > 0 && setIsPopoverOpen(true)
                    }
                  />

                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={clearSelectedCustomer}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {loadingSuggestions && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverTrigger>

              <PopoverContent
                className="p-0 w-[400px]"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command>
                  <CommandList>
                    {customerSuggestions.map((c) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => handleCustomerSelect(c)}
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
              </PopoverContent>
            </Popover>
          </Field>

          {/* Phone + Address */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone Number *" error={errors.phoneNumber}>
              <Input
                value={form.phoneNumber}
                disabled={!!selectedCustomer}
                onChange={(e) =>
                  update("phoneNumber", Helpers.formatPhone(e.target.value))
                }
              />
            </Field>

            <Field label="Address">
              <Input
                value={form.address}
                disabled={!!selectedCustomer}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Order Date *" error={errors.orderDate}>
              <Input
                type="date"
                value={form.orderDate}
                onChange={(e) => update("orderDate", e.target.value)}
              />
            </Field>

            <Field label="Order Time *" error={errors.orderTime}>
              <Input
                value={form.orderTime}
                onChange={(e) => update("orderTime", e.target.value)}
              />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Order Notes">
            <Textarea
              rows={3}
              value={form.orderNotes}
              onChange={(e) => update("orderNotes", e.target.value)}
            />
          </Field>

          {/* Image Upload Area */}
          <div
            className="rounded-md border border-dashed p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => !previewUrl && selectFromSystem()}
          >
            {!previewUrl ? (
              <p className="text-sm text-muted-foreground">
                Drag image here or click to select
              </p>
            ) : (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  className="max-h-40 rounded"
                  alt="Preview"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Adding..." : "Add Order"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
