return {
  'github/copilot.vim',
  config = function()
    vim.keymap.set('i', '<C-[>', 'copilot#Accept("\\<CR>")', {
      expr = true,
      replace_keycodes = false,
    })
    vim.g.copilot_no_tab_map = true
    -- disable copilot with leader c d by running command Copilot disable
    vim.keymap.set('n', '<leader>cd', ':Copilot disable<CR>', {
      noremap = true,
      silent = true,
    })
    -- enable
    vim.keymap.set('n', '<leader>ce', ':Copilot enable<CR>', {
      noremap = true,
      silent = true,
    })
  end,
}
