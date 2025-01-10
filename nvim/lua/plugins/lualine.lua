return {
  'nvim-lualine/lualine.nvim',
  dependencies = { 'nvim-tree/nvim-web-devicons' },
  config = function()
    require('lualine').setup {
      options = {
        theme = 'onedark',
      },
      tabline = {
        lualine_c = {
          {
            'buffers',
            buffers_color = {
              'buffers',
              active = { bg = '#8957E5', fg = '#d4d4d4' },
              inactive = { bg = '#1e1e1e', fg = '#d4d4d4' },
            },
          },
        },
      },
      sections = {
        -- show only the first character of the mode. If it has a dash, show both
        -- e.g Normal -> N, Visual -> V, Visual-Block -> V-B
        lualine_a = {
          {
            'mode',
            fmt = function(mode)
              if mode:find '-' then
                return mode:sub(1, 1) .. '-' .. mode:match '%-(%w)'
              else
                return mode:sub(1, 1)
              end
            end,
          },
        },
        lualine_b = { 'diff', 'diagnostics' },
        lualine_c = {
          {
            'filename',
            file_status = true,
            path = 1,
          },
        },
        lualine_y = {},
      },
    }
  end,
}
