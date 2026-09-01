return {
  'stevearc/oil.nvim',
  ---@module 'oil'
  ---@type oil.SetupOpts
  opts = {
    view_options = {
      -- Show files and directories that start with "."
      show_hidden = true,
    },
  },
  dependencies = { { 'echasnovski/mini.icons', opts = {} } },
  -- dependencies = { "nvim-tree/nvim-web-devicons" }, -- use if prefer nvim-web-devicons
  -- Eager despite the `keys` entry: oil replaces netrw at load time, so lazying
  -- it on <leader>e would leave `nvim <dir>` and `:e <dir>/` on netrw until the
  -- first keypress.
  lazy = false,
  keys = {
    { '<leader>e', '<cmd>Oil<CR>', desc = 'File [e]xplorer' },
  },
}
