import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Card, IconButton,
} from '@mui/material';
import {
  UploadFileRounded, DownloadRounded, CloseRounded,
  CheckCircleRounded,
} from '@mui/icons-material';
import { bulkUploadProducts } from '../utils/api';

// CSV template header
const CSV_HEADERS = ['title', 'description', 'price', 'unit', 'category', 'stock', 'delivery_time_minutes', 'available_from', 'available_until'];
const SAMPLE_ROWS = [
  ['Fresh Tomatoes', 'Farm fresh red tomatoes', '30', 'kg', 'Vegetables & Fruits', '20', '30', '06:00', '12:00'],
  ['Full Cream Milk', 'Fresh cow milk daily', '25', 'litre', 'Dairy', '50', '15', '05:00', '09:00'],
  ['Homemade Pickle', 'Spicy mango pickle', '80', 'jar', 'Handmade Goods', '', '', '', ''],
];

function downloadTemplate() {
  const rows = [CSV_HEADERS, ...SAMPLE_ROWS];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nearsell_products_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  // Skip header row
  return lines.slice(1).map(line => {
    // Handle quoted commas
    const cols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
    return {
      title: clean[0] || '',
      description: clean[1] || '',
      price: clean[2] || '',
      unit: clean[3] || 'piece',
      category: clean[4] || 'Other',
      stock: clean[5] || null,
      delivery_time_minutes: clean[6] || null,
      available_from: clean[7] || null,
      available_until: clean[8] || null,
    };
  }).filter(r => r.title && r.price);
}

export default function BulkUpload({ merchantLocation, deliveryArea, onDone }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFileName(file.name);
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      if (rows.length === 0) { setError('No valid rows found. Check your CSV format.'); return; }
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!preview.length) return;
    if (!merchantLocation || !deliveryArea) {
      setError('You must set your location and delivery area first by posting a single product.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      // Attach merchant location + delivery area to every row
      const products = preview.map(p => ({
        ...p,
        merchant_location: merchantLocation,
        delivery_area: deliveryArea,
      }));
      const res = await bulkUploadProducts(products);
      setResult(res.data);
      setPreview([]);
      setFileName('');
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const CATEGORY_COLOR = {
    'Vegetables & Fruits': '#E1F5EE',
    'Dairy': '#E6F1FB',
    'Handmade Goods': '#FFF3E0',
    'Cooked Food': '#FCE4EC',
    'Other': '#F3E5F5',
  };

  return (
    <Box>
      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Upload a CSV file to add multiple products at once. Download the template to see the correct format.
      </Alert>

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined" startIcon={<DownloadRounded />}
          onClick={downloadTemplate} size="small"
        >
          Download Template
        </Button>
        <Button
          variant="contained" startIcon={<UploadFileRounded />}
          onClick={() => inputRef.current?.click()} size="small"
        >
          {fileName ? 'Change File' : 'Choose CSV File'}
        </Button>
        <input ref={inputRef} type="file" accept=".csv" hidden onChange={handleFile} />
        {fileName && (
          <Chip label={fileName} onDelete={() => { setPreview([]); setFileName(''); }} />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Result */}
      {result && (
        <Alert
          severity={result.errors?.length > 0 ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          action={<Button size="small" onClick={onDone}>View Products</Button>}
        >
          <Typography variant="body2" fontWeight={600}>{result.message}</Typography>
          {result.errors?.length > 0 && (
            <Box mt={0.5}>
              {result.errors.map((e, i) => (
                <Typography key={i} variant="caption" color="error" display="block">
                  Row {e.row}: {e.error}
                </Typography>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {/* Preview Table */}
      {preview.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Preview — {preview.length} products ready to upload
            </Typography>
            <IconButton size="small" onClick={() => { setPreview([]); setFileName(''); }}>
              <CloseRounded fontSize="small" />
            </IconButton>
          </Box>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f7f6' }}>
                    {['Title', 'Category', 'Price', 'Unit', 'Stock', 'Time Window'].map(h => (
                      <TableCell key={h}><strong>{h}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{row.title}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                          {row.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.category}
                          size="small"
                          sx={{ fontSize: 10, bgcolor: CATEGORY_COLOR[row.category] || '#f5f5f5' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">₹{row.price}</Typography>
                      </TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>
                        {row.stock
                          ? <Chip label={row.stock} size="small" sx={{ fontSize: 10 }} />
                          : <Typography variant="caption" color="text.disabled">∞</Typography>}
                      </TableCell>
                      <TableCell>
                        {row.available_from || row.available_until
                          ? <Typography variant="caption">{row.available_from || '—'} to {row.available_until || '—'}</Typography>
                          : <Typography variant="caption" color="text.disabled">All day</Typography>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>

          <Button
            variant="contained" fullWidth size="large"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleRounded />}
            onClick={handleUpload}
            disabled={uploading}
            sx={{ py: 1.5 }}
          >
            {uploading ? `Uploading ${preview.length} products...` : `Upload ${preview.length} Products`}
          </Button>
        </>
      )}
    </Box>
  );
}
