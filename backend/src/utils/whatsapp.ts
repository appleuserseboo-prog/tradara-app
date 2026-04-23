export const contactSellerWhatsApp = (phone: string, itemName: string) => {
  // Logic: Clean the phone number and ensure country code
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '234' + cleanPhone.substring(1); // Default to Nigeria
  }
  
  const message = `Hello! I'm interested in your listing: "${itemName}" on the Market Place. Is it still available?`;
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  
  window.open(whatsappUrl, '_blank');
};