local js = function()
  local file = vim.fs.find({ 'biome.json' }, { type = 'file', upward = true })[1]
  if file then
    return { 'biome' }
  else
    return { 'prettierd' }
  end
end

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
        return {
          timeout_ms = 1000,
          lsp_fallback = true,
        }
      end,
      formatters_by_ft = {
        lua = { 'stylua' },
        htmldjango = { 'djlint' },
        html = js,
        javascript = js,
        typescript = js,
        typescriptreact = js,
        javascriptreact = js,
        json = js,
        python = { 'ruff_format' },
        markdown = { 'prettierd' },
        astro = { 'prettierd' },
        java = { 'clang-format' },
        php = { 'pretty-php' },
        yaml = { 'prettierd' },
        nginx = { 'nginxfmt' },
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

      vim.keymap.set('v', '<leader>ff', function()
        require('conform').format { async = true, lsp_fallback = true }
      end, { desc = 'Format selection' })
    end,
  },
}
-- vim: ts=2 sts=2 sw=2 et
