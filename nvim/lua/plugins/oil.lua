return {
  'stevearc/oil.nvim',
  ---@module 'oil'
  ---@type oil.SetupOpts
  opts = {},
  -- Optional dependencies
  dependencies = { { 'echasnovski/mini.icons', opts = {} } },
  -- dependencies = { "nvim-tree/nvim-web-devicons" }, -- use if prefer nvim-web-devicons
  config = function()
    require('oil').setup {
      vim.keymap.set('n', '<leader>so', '<CMD>Oil<CR>', { desc = '[S]earch [O]il' }),
      view_options = {
        -- Show files and directories that start with "."
        show_hidden = true,
      },
    }
  end,
}
