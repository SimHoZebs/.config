-- Here is a more advanced example where we pass configuration
-- options to `gitsigns.nvim`. This is equivalent to the following lua:
--    require('gitsigns').setup({ ... })
--
-- See `:help gitsigns` to understand what the configuration keys do
return {
  { -- Adds git related signs to the gutter, as well as utilities for managing changes
    'lewis6991/gitsigns.nvim',
    -- Gutter signs only matter once a real file is open; defer off startup.
    event = { 'BufReadPre', 'BufNewFile' },
    opts = {
      signs = {
        add = { text = '+' },
        change = { text = '~' },
        delete = { text = '_' },
        topdelete = { text = '‾' },
        changedelete = { text = '~' },
      },
      -- gitsigns calls on_attach per attached buffer, so these stay buffer-local
      -- and never shadow anything in a non-git buffer.
      on_attach = function(bufnr)
        local gitsigns = require 'gitsigns'

        local function map(mode, lhs, rhs, opts)
          opts = opts or {}
          opts.buffer = bufnr
          vim.keymap.set(mode, lhs, rhs, opts)
        end

        -- Navigation
        map('n', ']c', function()
          -- diffthis puts the window in diff mode, where ]c is vim's own
          -- change motion and already does the right thing.
          if vim.wo.diff then
            vim.cmd.normal { ']c', bang = true }
          else
            gitsigns.nav_hunk 'next'
          end
        end, { desc = 'Jump to next git [c]hange' })

        map('n', '[c', function()
          if vim.wo.diff then
            vim.cmd.normal { '[c', bang = true }
          else
            gitsigns.nav_hunk 'prev'
          end
        end, { desc = 'Jump to previous git [c]hange' })

        -- Inspect
        map('n', '<leader>gp', gitsigns.preview_hunk, { desc = 'git hunk [p]review' })
        map('n', '<leader>gi', gitsigns.preview_hunk_inline, { desc = 'git hunk preview [i]nline' })
        map('n', '<leader>gd', gitsigns.diffthis, { desc = 'git [d]iff file against index' })
        map('n', '<leader>gD', function()
          gitsigns.diffthis '~1'
        end, { desc = 'git [D]iff file against previous commit (HEAD~1)' })
        map('n', '<leader>gb', function()
          gitsigns.blame_line { full = true }
        end, { desc = 'git [b]lame line' })

        -- Toggles
        map('n', '<leader>gB', gitsigns.toggle_current_line_blame, { desc = 'git toggle current-line [B]lame' })
        map('n', '<leader>gt', gitsigns.toggle_deleted, { desc = 'git [t]oggle deleted lines' })
        map('n', '<leader>gw', gitsigns.toggle_word_diff, { desc = 'git toggle [w]ord diff' })
      end,
    },
  },
}
-- vim: ts=2 sts=2 sw=2 et
