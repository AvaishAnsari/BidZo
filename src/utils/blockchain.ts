import toast from 'react-hot-toast';

/**
 * Procedurally converts any UUID or string into a visually authentic Web3 ETH Hash.
 * Returns something like `0x7b1c4a095...`
 * 
 * @param id The raw string (likely an Auction ID or Bid ID)
 * @returns string 42-character mock transaction hash
 */
export function generateMockTxHash(id: string): string {
  if (!id) return '0x0000000000000000000000000000000000000000';
  
  // Strip hyphens from UUID and pad
  let cleanId = id.replace(/-/g, '').toLowerCase();
  
  // We need 40 hex characters for a standard ETH hash.
  // A UUID without hyphens is 32 characters. We will pad it deterministically.
  if (cleanId.length < 40) {
    // Reverse it and append to reach 40
    cleanId += cleanId.split('').reverse().join('');
  }
  
  return '0x' + cleanId.substring(0, 40);
}

/**
 * Shortens a full Tx Hash into a readable format (e.g. 0x7b1c...2f4a)
 */
export function shortenTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
}

/**
 * Wrapper for the native clipboard API to copy the hash and fire a beautiful success toast.
 */
export async function copyToClipboard(text: string, subject: string = 'Hash') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${subject} copied to clipboard!`, {
      style: {
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        color: '#4ade80',
        backdropFilter: 'blur(10px)',
      },
      iconTheme: {
        primary: '#4ade80',
        secondary: '#064e3b',
      },
    });
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}
