// Gedeelde lijst van flashback-foto's (gebruikt door de onboarding
// flash-sequentie én het Plakboek). Het GIFje staat expres laatst —
// in de onboarding als 'money shot', en wordt in het Plakboek
// uitgefilterd (te genant).

export const GIF_FILE = "5A4E9120-6113-4F88-89F6-91A49B3CB5BB.GIF";

export const FLASHBACK_IMGS = [
  "IMG_0718.JPG",
  "IMG_0719.JPG",
  "IMG_0720.JPG",
  "0f45905d-95a5-4988-9f6d-f86f8b6e7150.JPG",
  "11f0dd78-949d-4d54-b61f-8397eeda4d48.JPG",
  "1a10be55-255b-485b-88b2-6d40360eb3d4.JPG",
  "21167097-537b-443c-885d-60e9a5217cb7.JPG",
  "30bf8c1e-2ba5-4ee0-825b-0ffb71b4d3b1.JPG",
  "417bed7a-ceb0-4ebf-aab5-907005aec38b.JPG",
  "6886e389-429c-41d5-a6db-5125ee250e32.JPG",
  "7b65cc1e-13d5-4896-a85c-16da9f3e0fbe.JPG",
  "a05fe2f5-e74c-4fcb-8a81-3a474b4fffaa.JPG",
  "a87463c0-f0f1-46e4-b3a7-0ceb8999627a.JPG",
  "b39f71f9-c1d1-4083-881e-c254d0ddf0dd.JPG",
  "c41fc489-ef54-49df-82bf-bb4907372396.JPG",
  "d67d087a-f0dd-42a7-ab67-5d903652efc0.JPG",
  "d83ee4c2-bd91-47a0-9765-7a0c26e468a9.JPG",
  "efdc3533-e9ff-45e2-ab90-04f5f66429c0.JPG",
  "f7202d2d-f9b0-42ab-a328-3aba5536d7d6.JPG",
  "f88c4685-b35b-4280-b308-d865dc149d61.JPG",
  GIF_FILE,
];

// Lijst voor het Plakboek — alles behalve het GIFje.
export const PLAKBOEK_IMGS = FLASHBACK_IMGS.filter((f) => f !== GIF_FILE);
