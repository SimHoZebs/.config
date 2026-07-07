return {
  'L3MON4D3/LuaSnip',
  -- blink.cmp (InsertEnter) pulls this in; no need to load it at startup.
  lazy = true,
  dependencies = { 'rafamadriz/friendly-snippets' },
  config = function()
    -- Register the friendly-snippets library into LuaSnip. blink.cmp's
    -- 'snippets' source then surfaces them (snippets = { preset = 'luasnip' }
    -- in cmp.lua). Without this, friendly-snippets is installed but inert.
    require('luasnip.loaders.from_vscode').lazy_load()
  end,
}
