import { useState } from 'react';
import Modal from '../../../components/Modal';
import api from '../../../lib/api';
import InlineNotice from './InlineNotice';

export default function ProductQuickCreateModal({ open, onClose, merchantId, onCreated }) {
  const [title, setTitle] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTitle('');
    setProductUrl('');
    setSku('');
    setPrice('');
    setImageUrl('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !productUrl.trim()) {
      setError('Title and product URL are required.');
      return;
    }
    setSaving(true);
    api.products
      .create({
        merchantId: Number(merchantId),
        title: title.trim(),
        productUrl: productUrl.trim(),
        sku: sku.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        price: price === '' ? undefined : Number(price),
      })
      .then((r) => {
        onCreated(r.product);
        handleClose();
      })
      .catch((err) => setError(err.body?.error || err.message))
      .finally(() => setSaving(false));
  };

  return (
    <Modal open={open} title="New product" onClose={handleClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <InlineNotice variant="error" title="Couldn’t create product" dense>
            {error}
          </InlineNotice>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Product URL</label>
          <input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">SKU (optional)</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (optional)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Image URL (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
