export const downloadFile = async (
  content,
  {
    filename = "file",
    extension = "xml",
    mimeType = "application/xml",
    description = "XML SEPA-Sammellastschrift",
  } = {}
) => {
  const fullFilename = `${filename}.${extension}`;

  // Use File System Access API if available
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fullFilename,
        types: [
          {
            description,
            // @ts-ignore
            accept: {
              [mimeType]: [`.${extension}`],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      console.log("File saved using File System Access API.");
      return;
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("User aborted the save file dialog.");
        return; // Exit silently on abort
      }
      console.warn("File System Access API failed. Falling back.", err);
    }
  }

  // Fallback using Blob
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fullFilename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
  console.log("File downloaded using fallback method.");
};
