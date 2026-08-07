# Adding Resources to the UAD 3.6 Wiki — Permissions Checklist for Content Creators

**Read this before you link any document into the wiki.**

The wiki does not host copies of your files. Every resource page is a **live
embed** of the original Google Drive file. The embed renders against **each
staff member's own Google login** — so if the source file isn't shared
correctly, appraisers open the page and hit a **"You need access"** box instead
of the document. Getting sharing right *at the source, before you link it* is
the single most important step.

---

## The one rule that matters most

**Share to the whole `@truefootage.tech` domain as Viewer. Never use "Anyone
with the link."**

- **Domain (`truefootage.tech`) → Viewer** = every staff appraiser can read it,
  nobody outside True Footage can. This is what you want.
- **"Anyone with the link"** = a public URL that works with no login and can be
  forwarded outside the company. These docs contain internal QC and appraisal
  guidance — treat them as internal-only. **Do not make them public.**

If you drop the file into the correct **section subfolder** of the wiki's Drive
resource folder, it can inherit that folder's domain sharing automatically — the
preferred path, because you set permissions once on the folder and every file
inside is covered.

---

## Before you link — do these in order

1. **Confirm you (or the doc owner) can change sharing.** You must be Owner or
   have "Manager"/edit-with-share rights. If someone else owns it, either have
   *them* set domain sharing, or make a copy the team owns.

2. **Set sharing on the source file:**
   - Open the file → **Share**.
   - Under *General access*, choose **True Footage (truefootage.tech)**.
   - Set the role to **Viewer**.
   - Confirm it is **not** set to "Anyone with the link" / "Public."

3. **Decide on download/print/copy.** In **Share → Settings (gear)** there is a
   toggle: *"Viewers and commenters can see the option to download, print, and
   copy."* Leave this **ON** if you want the wiki's in-app **Download** button to
   work for staff. Turn it OFF only when you have a specific reason to lock the
   document down — and know that it disables downloading everywhere, not just in
   the wiki.

4. **Place or link the file:**
   - **Preferred:** move it into the matching **section subfolder** in the
     wiki's Drive resource folder, then run **Sync from Google Drive** in the
     Admin Console. It gets indexed and tagged to that section automatically.
   - **One-off / external file:** use **Add a resource** in the Admin Console and
     paste the file's share link.

5. **Publish it.** Manually added resources start as **Draft** — set the status
   to **Published** or staff will not see it.

---

## Native Google files vs. uploaded files

The wiki handles these differently, and so does sharing:

- **Native Google Docs / Sheets / Slides** — embed and download both work once
  domain sharing is set. Download delivers a PDF (Docs/Slides) or XLSX (Sheets).
- **Uploaded files (PDF, images, video, Office files)** — same domain-sharing
  rule. These download as the original file.

You don't need to know the internals — just set domain-Viewer sharing on
whatever you link, and pick the correct **Resource Type** when adding it
manually.

---

## Formatting note: avoid "cut off" documents

Google's embedded preview does **not** reflow **Pageless** documents. A pageless
doc — especially one with wide, multi-column tables — clips on the right edge
inside the embed, and it clips worse on smaller or scaled monitors. Appraisers
report this as "the document is cut off."

To keep documents readable in the wiki:

- In the doc: **File → Page setup → Pages** (not Pageless). Use **Landscape** if
  you have wide tables.
- Keep tables within page width; split very wide tables if needed.

---

## Quick pre-link checklist

- [ ] Source file shared to **truefootage.tech → Viewer**
- [ ] **Not** set to "Anyone with the link" / Public
- [ ] Download/print/copy toggle set the way you intend
- [ ] File is in the correct **section subfolder**, or link is ready for manual add
- [ ] Correct **Resource Type** selected (for manual adds)
- [ ] Doc is **Pages** layout, not Pageless (tables not clipped)
- [ ] Resource set to **Published**
- [ ] Opened the wiki page yourself in a normal staff account to confirm it
      renders and downloads

---

## Confidentiality reminder

These resources may be visible to 100+ staff. Do **not** embed borrower names,
property addresses tied to a specific order, client-identifying data, or any
non-public/confidential information in a wiki resource. Keep documents to
standards, guidance, and training content. When in doubt, leave it out and check
with the Quality & Development Team.
