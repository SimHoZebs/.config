return {
  'windwp/nvim-autopairs',
  event = 'InsertEnter',
  config = function()
    require('nvim-autopairs').setup {}
    -- Note: adding `(` after selecting a function used to be wired through
    -- nvim-cmp's confirm_done event here. blink.cmp does this natively via
    -- completion.accept.auto_brackets (on by default), so no hook is needed.
  end,
}
