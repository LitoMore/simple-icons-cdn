# simple-icons-cdn

Simple Icons CDN

## Usage

```
GET https://cdn.simpleicons.org/:icon_slug/:color?
```

### Parameters

#### `icon_slug`

All icon slugs can be found at [slugs.md](https://github.com/simple-icons/simple-icons/blob/master/slugs.md).

#### `color`

Optional. Default to the color of icon from [Simpleicons.org](https://simpleicons.org). It supports [hex colors](https://developer.mozilla.org/en-US/docs/Web/CSS/hex-color) and [CSS keywords](https://www.w3.org/wiki/CSS/Properties/color/keywords).

### Example

- <picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/simpleicons/eee"><source media="(prefers-color-scheme: light)" srcset="https://cdn.simpleicons.org/simpleicons"><img height="14" src="https://cdn.simpleicons.org/simpleicons"/></picture> - https://cdn.simpleicons.org/simpleicons
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/blue"/> - https://cdn.simpleicons.org/simpleicons/blue
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/hotpink"/> - https://cdn.simpleicons.org/simpleicons/hotpink
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/0cf"/> - https://cdn.simpleicons.org/simpleicons/0cf
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/0cf9"/> - https://cdn.simpleicons.org/simpleicons/0cf9
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/00ccff"/> - https://cdn.simpleicons.org/simpleicons/00ccff
- <img height="14" src="https://cdn.simpleicons.org/simpleicons/00ccff99"/> - https://cdn.simpleicons.org/simpleicons/00ccff99

### Domain aliases

- [cdn.simpleicons.org](https://cdn.simpleicons.org/simpleicons)
- [icons.ly](https://icons.ly/simpleicons) (using Cloudflare DNS)

## License

MIT
