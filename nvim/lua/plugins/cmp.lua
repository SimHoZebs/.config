return {
  { -- Autocompletion
    'saghen/blink.cmp',
    event = 'InsertEnter',
    -- Release tag: pulls a prebuilt Rust fuzzy-matcher binary, so no local
    -- toolchain is needed. Use '*' to track latest, but 1.* is stable.
    version = '1.*',
    dependencies = {
      -- Snippet engine. blink drives expansion/jumping through LuaSnip so the
      -- friendly-snippets library keeps working. See friendly-snippets.lua.
      'L3MON4D3/LuaSnip',
    },
    ---@module 'blink.cmp'
    ---@type blink.cmp.Config
    opts = {
      -- Keymaps carried over from the old nvim-cmp setup. `'fallback'` means:
      -- run the key's normal behavior when the completion menu isn't open.
      keymap = {
        preset = 'none',
        -- Select the [n]ext / [p]revious item.
        ['<Tab>'] = { 'select_next', 'fallback' },
        ['<S-Tab>'] = { 'select_prev', 'fallback' },
        -- Accept the completion (auto-imports / expands snippets when the LSP sends them).
        ['<CR>'] = { 'accept', 'fallback' },
        -- Manually trigger completion.
        ['<C-Space>'] = { 'show', 'fallback' },
        -- Jump forward/back through snippet placeholders (was LuaSnip <C-l>/<C-h>).
        ['<C-l>'] = { 'snippet_forward', 'fallback' },
        ['<C-h>'] = { 'snippet_backward', 'fallback' },
      },
      completion = {
        -- 'noinsert' parity: highlight the first item but don't insert its text
        -- until it's explicitly accepted with <CR>.
        list = { selection = { preselect = true, auto_insert = false } },
        -- The old setup surfaced LSP docs in the menu; keep that behavior.
        documentation = { auto_show = true, auto_show_delay_ms = 200 },
      },
      snippets = { preset = 'luasnip' },
      sources = {
        -- Was { nvim_lsp, luasnip, path }. blink's 'snippets' source reads from
        -- LuaSnip because of the preset above.
        default = { 'lsp', 'snippets', 'path' },
      },
      fuzzy = { implementation = 'prefer_rust_with_warning' },
    },
  },
}
-- vim: ts=2 sts=2 sw=2 et
