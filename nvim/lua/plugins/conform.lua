vim.g.autoformat_enabled = true

return {
  {
    'stevearc/conform.nvim',
    version = '*',
    -- VeryLazy (not BufWritePre): the <leader>ff/<leader>ft maps are registered
    -- in config, so deferring to first-write would leave them dead until a save.
    event = 'VeryLazy',
    opts = {
      notify_on_error = true,
      format_on_save = function(bufnr)
        if not vim.g.autoformat_enabled then
          return
        end
        local filetype = vim.bo[bufnr].filetype
        if vim.tbl_contains({ 'java', 'kotlin' }, filetype) then
          return
        end
        return {
          timeout_ms = 1000,
          lsp_fallback = true,
        }
      end,
      formatters_by_ft = {
        lua = { 'stylua' },
        htmldjango = { 'djlint' },
        html = { 'oxfmt' },
        javascript = { 'oxfmt' },
        typescript = { 'oxfmt' },
        typescriptreact = { 'oxfmt' },
        javascriptreact = { 'oxfmt' },
        json = { 'oxfmt' },
        python = { 'ruff_format' },
        markdown = { 'oxfmt' },
        astro = { 'oxfmt' },
        kotlin = { 'ktlint' },
        php = { 'pretty-php' },
        yaml = { 'oxfmt' },
        nginx = { 'nginxfmt' },
      },
      formatters = {
        oxfmt = {
          command = 'oxfmt',
          args = { '--stdin-filepath', '$FILENAME' },
          stdin = true,
        },
        ktlint = {
          prepend_args = function(_, ctx)
            return {
              '--editorconfig=' .. vim.fn.stdpath 'config' .. '/kotlin.editorconfig',
              '--stdin-path=' .. ctx.filename,
            }
          end,
        },
      },
    },
    config = function(_, opts)
      require('conform').setup(opts)

      vim.keymap.set('n', '<leader>ft', function()
        vim.g.autoformat_enabled = not vim.g.autoformat_enabled
        if vim.g.autoformat_enabled then
          vim.notify('Auto-format enabled', vim.log.levels.INFO)
        else
          vim.notify('Auto-format disabled', vim.log.levels.INFO)
        end
      end, { desc = 'Toggle auto-format' })

      vim.keymap.set('n', '<leader>ff', function()
        require('conform').format { async = true, lsp_fallback = true }
      end, { desc = 'Format buffer' })

      -- 'x' not 'v': 'v' also covers select mode, where a bare <Space> must
      -- replace the selection (LuaSnip placeholders) instead of starting a map.
      vim.keymap.set('x', '<leader>ff', function()
        require('conform').format { async = true, lsp_fallback = true }
      end, { desc = 'Format selection' })
    end,
  },
}
-- vim: ts=2 sts=2 sw=2 et
