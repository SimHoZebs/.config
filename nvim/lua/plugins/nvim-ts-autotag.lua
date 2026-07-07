return {
  'windwp/nvim-ts-autotag',
  -- Only auto-closes tags in markup filetypes; load only for those.
  ft = { 'html', 'xml', 'javascriptreact', 'typescriptreact', 'svelte', 'vue', 'astro', 'markdown', 'htmldjango' },
  config = function()
    require('nvim-ts-autotag').setup {
      autotag = {
        enable = true,
      },
    }
  end,
}
