import { useEffect, useRef, useState } from "react";

const initialForm = {
  customerName: "",
  phoneNumber: "",
  orderDate: "",
  orderTime: "",
  weight: "",
  address: "",
  orderNotes: "",
};

export default function OrderFormView({ onClose, onOrderCreated }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePath, setSelectedImagePath] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef();

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
  // Helpers
  // --------------------
  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const showError = (field, message) => {
    setErrors((e) => ({ ...e, [field]: message }));
  };

  const clearError = (field) => {
    setErrors((e) => {
      const copy = { ...e };
      delete copy[field];
      return copy;
    });
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
  // Phone formatting
  // --------------------
  const handlePhoneChange = (value) => {
    const formatted = Helpers.formatPhone(value);
    update("phoneNumber", formatted);
  };

  // --------------------
  // Image handling
  // --------------------
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file) => {
    if (!Helpers.validateImage(file)) {
      notifications.error("Invalid image file");
      return;
    }

    const resized = await Helpers.resizeImage(file);
    const dataUrl = await Helpers.blobToBase64(resized);

    setSelectedImage(resized);
    setSelectedImagePath(null);
    setPreviewUrl(dataUrl);
    clearError("image");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = [...e.dataTransfer.files].find((f) =>
      f.type.startsWith("image/")
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
      notifications.error("Failed to select image");
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedImagePath(null);
    setPreviewUrl(null);
  };

  // --------------------
  // Submit
  // --------------------
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validate()) {
      notifications.warning("Fix validation errors");
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
          null
        );
        if (!result.success) throw new Error(result.error);
        imagePath = result.imagePath;
      }

      const orderData = {
        ...form,
        imagePath,
      };

      const addResult = await Helpers.ipcInvoke("add-order", orderData);
      if (!addResult.success) throw new Error(addResult.error);

      notifications.success("Order added");

      onOrderCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      notifications.error("Failed to add order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------
  // Cancel
  // --------------------
  const handleCancel = () => {
    const hasData =
      Object.values(form).some(Boolean) ||
      selectedImage ||
      selectedImagePath;

    if (hasData) {
      const confirmed = confirm("Discard entered data?");
      if (!confirmed) return;
    }

    onClose();
  };

  // --------------------
  // Render
  // --------------------
  return (
    <div className="order-form-view">
      <div className="form-header">
        <h2>Add New Order</h2>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
      </div>

      <div className="order-form">
        <div className="form-grid">
          {/* Customer */}
          <Field
            label="Customer Name *"
            error={errors.customerName}
          >
            <input
              className="form-input"
              value={form.customerName}
              onChange={(e) =>
                update("customerName", e.target.value)
              }
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number *" error={errors.phoneNumber}>
            <input
              className="form-input"
              value={form.phoneNumber}
              onChange={(e) =>
                handlePhoneChange(e.target.value)
              }
            />
          </Field>

          {/* Date */}
          <Field label="Order Date *" error={errors.orderDate}>
            <input
              type="date"
              className="form-input"
              value={form.orderDate}
              onChange={(e) =>
                update("orderDate", e.target.value)
              }
            />
          </Field>

          {/* Time */}
          <Field label="Order Time *" error={errors.orderTime}>
            <input
              className="form-input"
              value={form.orderTime}
              onChange={(e) =>
                update("orderTime", e.target.value)
              }
            />
          </Field>

          {/* Weight */}
          <Field label="Weight">
            <input
              className="form-input"
              value={form.weight}
              onChange={(e) => update("weight", e.target.value)}
            />
          </Field>

          {/* Address */}
          <Field label="Address">
            <input
              className="form-input"
              value={form.address}
              onChange={(e) =>
                update("address", e.target.value)
              }
            />
          </Field>

          {/* Notes */}
          <div className="form-group full-width">
            <label>Order Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.orderNotes}
              onChange={(e) =>
                update("orderNotes", e.target.value)
              }
            />
          </div>

          {/* Image */}
          <div
            className="form-group full-width image-upload-area"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {!previewUrl && (
              <div className="upload-placeholder">
                <p>Drag image or select</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={selectFromSystem}
                >
                  Select Image
                </button>
              </div>
            )}

            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} />
                <button
                  className="btn-remove-image"
                  onClick={removeImage}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Adding..." : "Add Order"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}

// --------------------
// Small helper component
// --------------------
function Field({ label, error, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
