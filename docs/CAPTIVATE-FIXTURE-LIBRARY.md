# Community fixture library

The [Captivate Community Fixture Library](https://github.com/NicholasTracy/captivate-fixture-library) is a shared collection of **Captivate-native** fixture definitions—channel maps, emitter layouts, mover calibration, and 3D preview settings. You can browse by **manufacturer** and **model** inside Captivate, the same way you use the QLC+ or Open Fixture Library sources.

You do **not** need git or GitHub experience to share a fixture you built.

## Download a fixture

1. In Captivate, open **Fixtures**.
2. Click **Add** (+), then **Search For Fixture Online**.
3. Set **Source** to **Captivate Community Library**.
4. Pick a **manufacturer**, then a **model**, and click **Import**.

The fixture is added to your project. You can also import from **QLC+ Fixture Library** or **Open Fixture Library** using the same dialog.

## Share a fixture you built

1. Create or edit your fixture in Captivate (channels, ranges, emitters, groups, 3D model as needed).
2. Set **Manufacturer** and **Fixture Name** on the fixture.
3. Click **Share to Library…**, then **Share to Library**.

### What happens next

1. Your browser opens to **sign in on GitHub**. Captivate puts a sign-in code on your **clipboard**—**paste** it on the GitHub page when asked.
2. Captivate **sends your fixture** to the community library for you.
3. The library **checks** your fixture and **adds it automatically**. You do not approve anything yourself.
4. When it is ready, everyone can find it under **Captivate Community Library** in **Search For Fixture Online**. Tap **Refresh** if you do not see it yet.

You never manage git or open a pull request yourself.

### If sign-in does not work

Captivate may open the library website and copy your fixture to the clipboard instead:

1. Paste your fixture where the form asks for it.
2. Fill in **Manufacturer** and **Model name** to match your fixture.
3. Submit the form on the website.

The library finishes adding your fixture from there.

### Save a copy on your computer

Use **Share to Library…** → **Save a copy…** to keep a backup or use it with the web form.

### Submit from the web (without Captivate)

Use the [fixture submission form](https://github.com/NicholasTracy/captivate-fixture-library/issues/new?template=fixture-submission.yml) on the library repository. Export from Captivate with **Share to Library…** → **Save a copy…** if you need the file contents.

## Other fixture tools in Captivate

| Task | Where |
|------|--------|
| Import a file from disk | **Add** → **Import From File** |
| Save all project fixtures to disk | **Save DB** |
| Load a saved database file | **Load DB** |
| Export one fixture to a file | Edit fixture → **Export Fixture** |

Project saves also write a sibling `.cfx` fixture database next to the `.cap`
file. See [Project files and autosave](PROJECTS.md) for how that paired file is
used; **Load DB** and **Save DB** remain the manual import/export tools.

## Library repository

Browse published fixtures on GitHub:

**https://github.com/NicholasTracy/captivate-fixture-library**

Questions or problems with import or share? Ask on [GitHub Discussions](https://github.com/NicholasTracy/captivate-2/discussions) or [Discord](https://discord.gg/96DVPcMUUv).
