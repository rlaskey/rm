use std::process::ExitCode;

use clap::Parser;
use mail::cli::Cli;

fn main() -> ExitCode {
    // clap prints usage and exits with code 2 on bad arguments.
    let cli = Cli::parse();
    if let Err(e) = cli.validate() {
        eprintln!("Error: {e}");
        return ExitCode::FAILURE;
    }
    match mail::run(&cli) {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("Error: {e}");
            ExitCode::FAILURE
        }
    }
}
