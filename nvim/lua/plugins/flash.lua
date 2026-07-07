return {
  'folke/flash.nvim',
  -- keys alone lazy-loads on first use; the VeryLazy event forced it eager and
  -- defeated that, so it's dropped.
  opts = {},
  keys = {
    { '<leader>j', mode = { 'n', 'x', 'o' }, function() require('flash').jump() end, desc = 'Flash [J]ump' },
    { '<leader>J', mode = { 'n', 'x', 'o' }, function() require('flash').treesitter() end, desc = 'Flash Treesitter' },
    { 'r', mode = 'o', function() require('flash').remote() end, desc = 'Remote Flash' },
    { 'R', mode = { 'o', 'x' }, function() require('flash').treesitter_search() end, desc = 'Treesitter Search' },
    { '<c-s>', mode = { 'c' }, function() require('flash').toggle() end, desc = 'Toggle Flash Search' },
  },
}
