# simple-icons-cdn

Simple Icons CDN

## Usage

```
GET https://si-cdn.vercel.app/:icon_slug/:color?
```

### Parameters

#### `icon_slug`

All icon slugs can be found at [slugs.md](https://github.com/simple-icons/simple-icons/blob/master/slugs.md).

#### `color`

Optional. Default to the color of icon from [Simple Icons](https://simpleicons.org).

### Example

- <picture><source media="(prefers-color-scheme: dark)" srcset="https://si-cdn.vercel.app/simpleicons/eee"><source media="(prefers-color-scheme: light)" srcset="https://si-cdn.vercel.app/simpleicons"><img height="14" src="https://si-cdn.vercel.app/simpleicons"/></picture> - https://si-cdn.vercel.app/simpleicons
- <img height="14" src="https://si-cdn.vercel.app/simpleicons/blue"/> - https://si-cdn.vercel.app/simpleicons/blue
- <img height="14" src="https://si-cdn.vercel.app/simpleicons/hotpink"/> - https://si-cdn.vercel.app/simpleicons/hotpink
- <img height="14" src="https://si-cdn.vercel.app/simpleicons/00ccff"/> - https://si-cdn.vercel.app/simpleicons/00ccff
- <img height="14" src="https://si-cdn.vercel.app/simpleicons/f9c"/> - https://si-cdn.vercel.app/simpleicons/f9c

### Domain aliases

- si-cdn.vercel.app
- si-cdn.now.sh
- icons.ly (using Cloudflare DNS)

## License

MIT
