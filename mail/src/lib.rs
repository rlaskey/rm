pub mod base64;
pub mod cli;
pub mod headers;
pub mod md5;
pub mod process;

use std::fs::File;
use std::io::{self, BufReader, BufWriter, Read, Write};

use crate::cli::Cli;
use crate::process::Process;

/// Run the MBOX filter described by `cli`.
pub fn run(cli: &Cli) -> io::Result<()> {
    let reader: Box<dyn Read> = match &cli.input {
        Some(path) => Box::new(BufReader::new(File::open(path)?)),
        None => Box::new(io::stdin().lock()),
    };
    let writer: Box<dyn Write> = match &cli.output {
        Some(path) => Box::new(BufWriter::new(File::create(path)?)),
        None => Box::new(io::stdout().lock()),
    };
    Process::new(reader, writer, cli.attachments.clone(), cli.strip_attachments).run()
}
