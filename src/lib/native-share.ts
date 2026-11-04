export async function shareContent(title: string, text: string, url?: string) {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  } else {
    const shareUrl = `${text} ${url || ''}`;
    await navigator.clipboard.writeText(shareUrl);
  }
}
