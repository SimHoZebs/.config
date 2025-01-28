return {
  { -- Autoformat
    'stevearc/conform.nvim',
    event = { 'BufWritePre' },
    opts = {
      notify_on_error = true,
      format_on_save = {
        timeout_ms = 1000,
        lsp_fallback = true,
      },
      formatters_by_ft = {
        lua = { 'stylua' },
        html = { 'biome', 'prettierd', 'eslint_d' },
        htmldjango = { 'djlint' },
        javascript = { 'biome', 'prettierd' },
        typescript = { 'biome', 'prettierd' },
        python = { 'black' },
        typescriptreact = { 'biome', 'prettierd' },
        javascriptreact = { 'biome', 'prettierd' },
        json = { 'biome', 'prettierd' },
        astro = { 'prettierd' },
        java = { 'clang-format' },
        nix = { 'nixfmt' },
        php = { 'pretty-php' },
      },
      formatters = {
        biome = {
          command = 'biome',
          args = { 'format', '--stdin-file-path', '$FILENAME', '--fix' },
        },
      },
    },
  },
}
-- vim: ts=2 sts=2 sw=2 et
