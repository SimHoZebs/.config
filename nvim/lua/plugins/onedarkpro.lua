return {
  'olimorris/onedarkpro.nvim',
  priority = 1000, -- Ensure it loads first
  config = function()
    require('onedarkpro').setup {
      colors = {
        onedark = { bg = '#252623' },
      },
    }
    -- Load the colorscheme here
    vim.cmd.colorscheme 'onedark'

    -- You can configure highlights by doing something like
    vim.cmd.hi 'Comment gui=none'
  end,
}
