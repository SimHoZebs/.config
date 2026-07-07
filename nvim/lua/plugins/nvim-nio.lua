-- Only used by nvim-dap-ui (async runtime). lazy = true keeps it off startup;
-- dap-ui pulls it in when debugging begins.
return { 'nvim-neotest/nvim-nio', lazy = true }
