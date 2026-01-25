import { useEffect, useRef, useState } from "react";
import Helpers from "@/utils/helpers";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Command, CommandList, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";

import { X } from "lucide-react";

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
  // Debounced customer search (real DB)
  // --------------------
  useEffect(() => {
    if (!customerQuery || selectedCustomer) return;

    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);

        const result = await Helpers.ipcInvoke(
          "search-customers",
          customerQuery,
        );

        if (result.success) {
          setCustomerSuggestions(result.customers || []);
        }
      } catch (err) {
        console.error("Customer search failed", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 1500);

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
  // Validation
  // --------------------
  const validate = () => {
    const next = {};

    if (!Helpers.validateRequired(form.customerName)) {
      next.customerName = "Customer name is required";
    }

    if (!Helpers.validateRequired(form.phoneNumber)) {
      next.phoneNumber = "Phone number is required";
    } else if (!Helpers.validatePhone(form.phoneNumber)) {
      next.phoneNumber = "Invalid phone number";
    }

    if (!form.orderDate) next.orderDate = "Order date is required";
    if (!form.orderTime) next.orderTime = "Order time is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // --------------------
  // Customer selection
  // --------------------
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSuggestions([]);
    setCustomerQuery("");

    update("customerName", customer.name);
    update("phoneNumber", customer.contact);
    update("address", customer.address ?? "");
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSuggestions([]);
    setCustomerQuery("");

    update("customerName", "");
    update("phoneNumber", "");
    update("address", "");
  };

  // --------------------
  // Image handling
  // --------------------
  const handleFile = async (file) => {
    if (!Helpers.validateImage(file)) {
      toast({
        variant: "destructive",
        title: "Invalid image file",
      });
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
      toast({
        variant: "destructive",
        title: "Failed to select image",
      });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImagePath(null);
    setPreviewUrl(null);
  };

  // --------------------
  // Submit (real DB transaction)
  // --------------------
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!validate()) {
      toast({
        title: "Validation error",
        description: "Fix validation errors before submitting.",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      let imagePath = null;

      if (selectedImage) {
        const data = await Helpers.blobToBase64(selectedImage);
        const result = await Helpers.ipcInvoke("save-image", data, null);
        if (!result.success) throw new Error(result.error);
        imagePath = result.imagePath;
      }

      if (selectedImagePath) {
        const result = await Helpers.ipcInvoke(
          "save-image",
          selectedImagePath,
          null,
        );
        if (!result.success) throw new Error(result.error);
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

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Order added successfully",
      });

      onOrderCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to add order",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------
  // Render
  // --------------------
  return (
    <div className="flex justify-center p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Order</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Customer Name */}
          <Field label="Customer Name *" error={errors.customerName}>
            <div className="relative">
              <Input
                value={form.customerName}
                placeholder="Start typing customer name..."
                disabled={!!selectedCustomer}
                onChange={(e) => {
                  update("customerName", e.target.value);
                  setCustomerQuery(e.target.value);
                }}
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

              {!selectedCustomer && customerSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow">
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
                </div>
              )}

              {loadingSuggestions && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Searching...
                </div>
              )}
            </div>
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

          {/* Image */}
          <div
            className="rounded-md border border-dashed p-4 text-center"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {!previewUrl && (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Drag image or select
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={selectFromSystem}
                >
                  Select Image
                </Button>
              </>
            )}

            {previewUrl && (
              <div className="relative inline-block">
                <img src={previewUrl} className="max-h-40 rounded" />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={handleSubmit} disabled={isSubmitting}>
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
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}

// --------------------
// Field wrapper
// --------------------
function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
