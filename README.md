# simple-icons-cdn

Simple Icons CDN

## Usage

```
GET https://icons.ly/:icon_slug/:color?
```

### Parameters

#### `icon_slug`

All icon slugs can be found at [slugs.md](https://github.com/simple-icons/simple-icons/blob/master/slugs.md).

#### `color`

Optional. Default to the color of icon from [Simple Icons](https://simpleicons.org).

### Example

- <picture><source media="(prefers-color-scheme: dark)" srcset="https://si-cdn.vercel.app/simpleicons/eee"><source media="(prefers-color-scheme: light)" srcset="https://si-cdn.vercel.app/simpleicons"><img height="14" src="https://icons.ly/simpleicons"/></picture> - https://icons.ly/simpleicons
- <img height="14" src="https://icons.ly/simpleicons/blue"/> - https://icons.ly/simpleicons/blue
- <img height="14" src="https://icons.ly/simpleicons/hotpink"/> - https://icons.ly/simpleicons/hotpink
- <img height="14" src="https://icons.ly/simpleicons/00ccff"/> - https://icons.ly/simpleicons/00ccff
- <img height="14" src="https://icons.ly/simpleicons/f9c"/> - https://icons.ly/simpleicons/f9c


### Domain aliases

- icons.ly
- si-cdn.vercel.app
- si-cdn.now.sh

## License

MIT
