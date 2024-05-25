<h1 align="center">simple-icons-cdn</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Powered%20by%20Fly.io-6044B2?style=flat-square" />
</p>

## Disclaimer

We ask that all users read the [legal disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) before using icons from Simple Icons.

## Usage

```
GET https://cdn.simpleicons.org/:icon_slug/:color?/:dark_mode_color?
```

### Parameters

#### `icon_slug`

You can simply click the icon title on [simpleicons.org](https://simpleicons.org) to copy the slug.

All icon slugs can be found at [slugs.md](https://github.com/simple-icons/simple-icons/blob/master/slugs.md).

#### `color`

Optional. Default to the color of icon from [simpleicons.org](https://simpleicons.org). It supports [hex colors](https://developer.mozilla.org/en-US/docs/Web/CSS/hex-color) and [CSS keywords](https://www.w3.org/wiki/CSS/Properties/color/keywords). Passing in an invalid value will use the default color as a fallback.

#### `dark_mode_color`

Optional. It's used for dark mode and has the same function as `color`. The [CSS prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) will be used when a value is specified.

#### `viewbox`

Optional. The icon is placed in a square viewBox by default. Use the query parameter `viewbox=auto` to adjust the viewBox to the same aspect ratio as the shape.

### Examples

- <img height="14" src="https://cdn.simpleicons.org/simpleicons/111/eee"/> - https://cdn.simpleicons.org/simpleicons
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/blue"/> - https://cdn.simpleicons.org/simpleicons/blue
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/hotpink"/> - https://cdn.simpleicons.org/simpleicons/hotpink
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/0cf"/> - https://cdn.simpleicons.org/simpleicons/0cf
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/0cf9"/> - https://cdn.simpleicons.org/simpleicons/0cf9
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/00ccff"/> - https://cdn.simpleicons.org/simpleicons/00ccff
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/00ccff99"/> - https://cdn.simpleicons.org/simpleicons/00ccff99
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/orange/pink"/> - https://cdn.simpleicons.org/simpleicons/orange/pink
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/_/eee"/> - https://cdn.simpleicons.org/simpleicons/_/eee
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/eee/_"/> - [https://cdn.simpleicons.org/simpleicons/eee/\_](https://cdn.simpleicons.org/simpleicons/eee/_)

#### Auto-sized

This is useful if you want all icons rendered with consitent size.

```markdown
<img height="20" src="https://cdn.simpleicons.org/github?viewbox=auto" />
<img height="20" src="https://cdn.simpleicons.org/simpleicons?viewbox=auto" />
<img height="20" src="https://cdn.simpleicons.org/awesomelists?viewbox=auto" />
```

<p align="center">
  <img height="20" src="https://cdn.simpleicons.org/github?viewbox=auto" />
  <img height="20" src="https://cdn.simpleicons.org/simpleicons?viewbox=auto" />
  <img height="20" src="https://cdn.simpleicons.org/awesomelists?viewbox=auto" />
</p>

### Other usages

#### Raycast

Easily browse, search, and copy icon SVG source, brand color, guidelines, and CDN links with Raycast.

<p align="center">
  <a title="Install simple-icons Raycast Extension" href="https://www.raycast.com/litomore/simple-icons">
      <img src="https://www.raycast.com/litomore/simple-icons/install_button@2x.png?v=1.1" height="64" alt="" style="height: 64px;">
  </a>
</p>

#### Notion

You can use this icon CDN anywhere in Notion which allows you to insert a custom image or icon.

<p align="center">
  <img width="400" src="https://raw.githubusercontent.com/LitoMore/simple-icons-cdn/main/media/notion-screenshot.png" />
</p>

### Domain aliases

- [cdn.simpleicons.org](https://cdn.simpleicons.org/simpleicons)
- [icons.ly](https://icons.ly/simpleicons) (using Cloudflare DNS)

## License

MIT
