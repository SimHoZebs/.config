return {
  'L3MON4D3/LuaSnip',
  dependencies = { 'rafamadriz/friendly-snippets' },
  config = function()
    -- Register the friendly-snippets library into LuaSnip. blink.cmp's
    -- 'snippets' source then surfaces them (snippets = { preset = 'luasnip' }
    -- in cmp.lua). Without this, friendly-snippets is installed but inert.
    require('luasnip.loaders.from_vscode').lazy_load()
  end,
}
