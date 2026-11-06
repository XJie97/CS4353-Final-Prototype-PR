import { useState } from "react";
import { useApp, uid } from "../app/context";
import { LOCKERS, type Item } from "../app/domain";
import { ErrorText, Modal } from "../components/ui/shared";
import { PhotoField } from "../components/ui/PhotoField";
const CATEGORIES = [
  "Home",
  "Electronics",
  "Party Supplies",
  "Outdoors",
  "Clothing",
  "Tools",
  "Sports",
];

export function ListingForm({
  item,
  onClose,
}: {
  item?: Item;
  onClose: () => void;
}) {
  const { perform, toast, busy: saving } = useApp();
  const [newId] = useState(uid);
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [category, setCategory] = useState(item?.category ?? "Home");
  const [location, setLocation] = useState(item?.location ?? "Clementi");
  const [photo, setPhoto] = useState(
    item && item.image !== "/assets/item-placeholder.png" ? item.image : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    // Reuse one modal form for creating a listing or editing an existing listing.
    <Modal title={item ? "Edit listing" : "Share an item"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await perform({
            type: item ? "edit-item" : "create-item",
            id: item?.id ?? newId,
            name,
            description,
            category,
            location,
            images: photo ? [photo] : [],
          });
          // Keep the listing form open and display the save error on failure.
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast(
            item ? "Listing updated." : "Your item is now available to borrow.",
          );
          onClose();
        }}
      >
        <label>
          Item name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            placeholder="e.g. Cordless drill"
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={2000}
            placeholder="Describe your item and anything borrowers should know."
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              // Represent one supported listing category in the category selector.
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Community location
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {LOCKERS.map((l) => (
              // Represent one supported community location in the listing form.
              <option key={l.id}>{l.name}</option>
            ))}
          </select>
        </label>

        <PhotoField
          label="Item photo (optional)"
          value={photo}
          onChange={setPhoto}
          onBusyChange={setBusy}
        />
        <ErrorText text={error} />
        <div className="form-actions">
          <button
            disabled={saving}
            className="button"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={saving || busy}
            className="button primary"
            type="submit"
          >
            Save listing
          </button>
        </div>
      </form>
    </Modal>
  );
}
