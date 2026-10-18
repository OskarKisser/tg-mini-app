import { test, expect, type Page } from "@playwright/test";
import { blockBackendWrites } from "./helpers/block-writes";

const DEV_USER_ID = "1";
const BASE_PARAMS = `?devUserId=${DEV_USER_ID}`;

test.beforeEach(async ({ page }) => {
  await blockBackendWrites(page);
});

const STORE_KEY = "omf_create_release_draft_v2";

async function navigateTo(page: Page, path: string) {
  await page.goto(`${path}${BASE_PARAMS}`);
}

function tinyPngBuffer(): Buffer {
  // 1x1 transparent PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl7sAAAAASUVORK5CYII=",
    "base64"
  );
}

function fakeWavBuffer(): Buffer {
  // Valid extension but invalid RIFF header payload.
  return Buffer.from("not-a-riff-wave", "utf8");
}

async function seedDraftState(page: Page, state: Record<string, unknown>) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: STORE_KEY,
      value: JSON.stringify({ state, version: 0 })
    }
  );
}

function metadataFixture() {
  return {
    primaryArtist: "Regression Artist",
    releaseTitle: "Regression Release",
    language: "RU",
    explicit: false,
    genre: "Techno",
    releaseType: "single",
    releaseDate: "2099-12-31",
    label: "OMF",
    authorFullName: "Регрессов Тест Тестович",
    musicAuthor: "Regression Beatmaker",
    licenseType: "own",
    tiktokStart: "0:45"
  };
}

test.describe("@regression Create release wizard — level2 files regression", () => {
  test("assets rejects non-image files for cover", async ({ page }) => {
    await seedDraftState(page, {
      metadata: metadataFixture(),
      releaseId: null,
      artworkUrl: null,
      tracks: [{ title: "Track 1", explicit: false, lyrics: "", featuringArtistNames: [] }],
      trackAudioUrlsFromDb: [null],
      releaseArtistLinks: {},
      lastModified: Date.now(),
      successSummary: null
    });

    await navigateTo(page, "/create/assets");
    const coverInput = page.locator("input[type='file']").first();
    await coverInput.setInputFiles({
      name: "cover.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("bad cover", "utf8")
    });

    await expect(
      page.getByText(/обложка должна быть в формате jpg или png/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("assets rejects low-resolution png", async ({ page }) => {
    await seedDraftState(page, {
      metadata: metadataFixture(),
      releaseId: null,
      artworkUrl: null,
      tracks: [{ title: "Track 1", explicit: false, lyrics: "", featuringArtistNames: [] }],
      trackAudioUrlsFromDb: [null],
      releaseArtistLinks: {},
      lastModified: Date.now(),
      successSummary: null
    });

    await navigateTo(page, "/create/assets");
    const coverInput = page.locator("input[type='file']").first();
    await coverInput.setInputFiles({
      name: "tiny.png",
      mimeType: "image/png",
      buffer: tinyPngBuffer()
    });

    await expect(
      page.getByText(/обложка меньше 3000×3000 пикселей/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("tracks rejects wrong extension in wav uploader", async ({ page }) => {
    await seedDraftState(page, {
      metadata: metadataFixture(),
      releaseId: "test-release-id",
      artworkUrl: "https://e2e.supabase.co/storage/v1/object/public/artwork/1/e2e/cover.png",
      tracks: [{ title: "Track 1", explicit: false, lyrics: "", featuringArtistNames: [] }],
      trackAudioUrlsFromDb: [null],
      releaseArtistLinks: {},
      lastModified: Date.now(),
      successSummary: null
    });

    await navigateTo(page, "/create/tracks");
    const wavInput = page.locator("input[type='file']").first();
    await wavInput.setInputFiles({
      name: "track.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("bad audio", "utf8")
    });

    await expect(page.getByText(/нужен файл в формате wav/i)).toBeVisible({ timeout: 10_000 });
  });

  test("tracks shows RIFF validation error for malformed wav", async ({ page }) => {
    await seedDraftState(page, {
      metadata: metadataFixture(),
      releaseId: "test-release-id",
      artworkUrl: "https://e2e.supabase.co/storage/v1/object/public/artwork/1/e2e/cover.png",
      tracks: [{ title: "Track 1", explicit: false, lyrics: "", featuringArtistNames: [] }],
      trackAudioUrlsFromDb: [null],
      releaseArtistLinks: {},
      lastModified: Date.now(),
      successSummary: null
    });

    await navigateTo(page, "/create/tracks");
    const wavInput = page.locator("input[type='file']").first();
    await wavInput.setInputFiles({
      name: "track.wav",
      mimeType: "audio/wav",
      buffer: fakeWavBuffer()
    });

    await expect(page.getByText(/файл не является riff-контейнером/i).first()).toBeVisible({
      timeout: 10_000
    });
  });

  test("review blocks submit and prompts return when wav files are missing", async ({ page }) => {
    await seedDraftState(page, {
      metadata: metadataFixture(),
      releaseId: "test-release-id",
      artworkUrl: "https://e2e.supabase.co/storage/v1/object/public/artwork/1/e2e/cover.png",
      tracks: [{ title: "Track 1", explicit: false, lyrics: "", featuringArtistNames: [] }],
      trackAudioUrlsFromDb: [null],
      releaseArtistLinks: {},
      lastModified: Date.now(),
      successSummary: null
    });

    await navigateTo(page, "/create/review");
    await expect(page.getByText(/выбери wav заново/i)).toBeVisible({
      timeout: 10_000
    });
    await expect(page.getByRole("link", { name: /изменить треки/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /отправить на проверку/i })).toBeDisabled();
  });
});

