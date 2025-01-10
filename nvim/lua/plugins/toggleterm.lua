return {
  {
    'akinsho/toggleterm.nvim',
    version = '*',
    config = function()
      require('toggleterm').setup {}
      vim.api.nvim_set_keymap('n', '<leader>tt', ':ToggleTerm direction=tab<CR>', { noremap = true, silent = true })
      vim.api.nvim_set_keymap('t', '<Esc>', [[<C-\><C-n>]], { noremap = true, silent = true })
      -- Open ToggleTerm in a floating window
      vim.api.nvim_set_keymap('n', '<leader>tf', ':ToggleTerm direction=float<CR>', { noremap = true, silent = true })

      -- Close ToggleTerm
      vim.api.nvim_set_keymap('n', '<leader>tc', ':ToggleTermToggleAll<CR>', { noremap = true, silent = true })

      -- Open ToggleTerm below
      vim.api.nvim_set_keymap('n', '<leader>tb', ':ToggleTerm direction=horizontal<CR>', { noremap = true, silent = true })

      -- Open ToggleTerm to the right
      vim.api.nvim_set_keymap('n', '<leader>tr', ':ToggleTerm direction=vertical<CR>', { noremap = true, silent = true })
    end,
  },
}
