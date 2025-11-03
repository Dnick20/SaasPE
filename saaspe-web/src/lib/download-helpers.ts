/**
 * Download Helpers
 *
 * Utilities for downloading files from Blob data with proper filename generation
 * and browser compatibility handling.
 */

/**
 * Sanitize a string to be used safely in a filename
 * Removes or replaces characters that are problematic in filenames
 *
 * @param str - The string to sanitize
 * @param maxLength - Maximum length of the sanitized string (default: 50)
 * @returns Sanitized string safe for use in filenames
 */
export function sanitizeFilename(str: string, maxLength: number = 50): string {
  if (!str) return 'untitled';

  return str
    // Replace common problematic characters with safe alternatives
    .replace(/[<>:"/\\|?*]/g, '-')
    // Replace multiple spaces or dashes with a single dash
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing dashes and spaces
    .trim()
    .replace(/^-+|-+$/g, '')
    // Truncate to max length
    .substring(0, maxLength)
    // Remove trailing dash if truncation created one
    .replace(/-+$/, '')
    // Fallback if everything was removed
    || 'untitled';
}

/**
 * Generate a filename for a proposal PDF
 * Format: {clientName}-{proposalTitle}-{date}.pdf
 *
 * @param clientName - Name of the client
 * @param proposalTitle - Title of the proposal
 * @param date - Date to include in filename (defaults to today)
 * @returns Sanitized filename with .pdf extension
 *
 * @example
 * generateProposalFilename('Acme Corp', 'Q4 Marketing Campaign', new Date('2025-10-29'))
 * // Returns: "Acme-Corp-Q4-Marketing-Campaign-2025-10-29.pdf"
 */
export function generateProposalFilename(
  clientName: string,
  proposalTitle: string,
  date: Date = new Date()
): string {
  const sanitizedClient = sanitizeFilename(clientName, 30);
  const sanitizedTitle = sanitizeFilename(proposalTitle, 40);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

  return `${sanitizedClient}-${sanitizedTitle}-${dateStr}.pdf`;
}

/**
 * Download a file from Blob data with proper filename
 * Creates a temporary anchor element to trigger the download
 *
 * @param blob - Blob data to download
 * @param filename - Filename to use for the download
 * @throws Error if Blob API is not supported
 *
 * @example
 * const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
 * downloadBlob(pdfBlob, 'proposal.pdf');
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Check for Blob API support
  if (typeof window === 'undefined' || !window.URL || !window.URL.createObjectURL) {
    throw new Error('Blob download is not supported in this browser');
  }

  // Create a temporary URL for the Blob
  const url = window.URL.createObjectURL(blob);

  try {
    // Create a temporary anchor element
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;

    // Append to body, click, and remove
    // (Safari requires the element to be in the DOM)
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Clean up the temporary URL after a short delay
    // (some browsers need time to process the download)
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

/**
 * Download a PDF from a URL by fetching and converting to Blob
 * Useful when you have a URL but want to use Blob download for better UX
 *
 * @param url - URL of the PDF to download
 * @param filename - Filename to use for the download
 * @throws Error if fetch fails or response is not OK
 *
 * @example
 * await downloadPdfFromUrl('/api/proposals/123/pdf', 'my-proposal.pdf');
 */
export async function downloadPdfFromUrl(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    // Verify it's a PDF
    if (!blob.type.includes('pdf')) {
      console.warn(`Expected PDF but got ${blob.type}`);
    }

    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

/**
 * Download proposal PDF with automatic filename generation
 * Convenience function that combines filename generation and download
 *
 * @param pdfUrl - URL of the PDF to download
 * @param clientName - Name of the client
 * @param proposalTitle - Title of the proposal
 * @param date - Date to include in filename (defaults to today)
 * @throws Error if download fails
 *
 * @example
 * await downloadProposalPdf(
 *   '/api/proposals/123/pdf',
 *   'Acme Corp',
 *   'Q4 Marketing Campaign'
 * );
 */
export async function downloadProposalPdf(
  pdfUrl: string,
  clientName: string,
  proposalTitle: string,
  date?: Date
): Promise<void> {
  const filename = generateProposalFilename(clientName, proposalTitle, date);
  await downloadPdfFromUrl(pdfUrl, filename);
}

/**
 * Check if Blob download is supported in the current browser
 * Useful for showing fallback UI
 *
 * @returns true if Blob download is supported
 */
export function isBlobDownloadSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.URL &&
    !!window.URL.createObjectURL &&
    !!window.Blob
  );
}
