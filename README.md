<h1 align="center">simple-icons-cdn</h1>

<p align="center">
  <a href="https://vercel.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://shields.io/badge/Powered_by_Vercel-white?logo=vercel&style=flat-square&logoColor=black" />
      <source media="(prefers-color-scheme: light)" srcset="https://shields.io/badge/Powered_by_Vercel-black?logo=vercel&style=flat-square" />
      <img src="https://shields.io/badge/Powered_by_Vercel-black?logo=vercel&style=flat-square" alt="Powered by Vercel" />
    </picture>
  </a>
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

### Example

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

### Other usages

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
