return {
  {
    'nvim-treesitter/nvim-treesitter-context',
    -- Sticky-context header only matters with a file open; defer off startup.
    event = { 'BufReadPost', 'BufNewFile' },
  },
}
