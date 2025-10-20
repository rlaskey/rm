# INSTALL

## Linode: Setup

Go with Arch linux. Select a datacenter that is near you / near the general
audience you want to serve.

On Windows, set up WSL. On macOS, use the Terminal.

Create an SSH key and drop the public key into your new Linode.

Once the host is up, you'll get an SSH command, from the Linode dashboard.
it'll be something like this:

```sh
ssh root@A.B.C.D
```

Run that, from your computer, where `A.B.C.D.` is the IP address for your new
Linode. This command logs you into your Linode. That's where you'll do most of
your work.

### via SSH: root: add a user

Where we say `user`, make up your own name. It should probably be lower case,
something simple.

```sh
pacman -Rdd linux-firmware # weird thing re: arch upgrade
pacman -Syu # upgrade packages
pacman -Sy git ansible # we'll at least need this
useradd -m -G wheel user
EDITOR=nano visudo
```

Now you'll be in nano, a reasonably understandable editor. Find the part of the
file towards the end, and uncomment the line that reads:

```
%wheel ALL=(ALL:ALL) NOPASSWD: ALL
```

If you're feeling sweaty, that's OK. Learning this stuff can take a while.

Next, run this:

```sh
su - user # you'll see the # prompt turns to $ when you're a user
mkdir -p ~/.ssh; chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys
nano ~/.ssh/authorized_keys
```

Now, copy in your public key. On your laptop, this is LIKELY
`~/.ssh/id_ed25519.pub`. Find the file, copy the contents, paste it in this
`user` `authorized_keys` file.

### via SSH: user: setup

```sh
ssh user@A.B.C.D
```

Now, we're logging in as your user, not as root.


```sh
ssh-keygen -C 'linode-project'
```

^^ this creates a new SSH key, on your Linode. Replace `project` with whatever
you want to call your project.

```sh
cat ~/.ssh/id_ed25519.pub
```

^^ or whatever it says about `Your public key has been saved in ...` from the
previous command. The idea here is that the private key never leaves your
Linode. The public key is copied in to GitHub, for example, so that from your
Linode, having your private key nearby, you can use that private key get into
other resources which are accessible via this public key.

Now, in https://github.com/settings/keys you can add this public key. That way,
say your Linode is compromised, you can remove this separate public key from
GitHub + the private key is then useless. Security.

```sh
git config --global user.name 'First Last'
git config --global user.email 'you@email.com'
git clone git@github.com:rlaskey/rm.git
```

Now, you'll have this repository, on your new Linode. Progress.

## DNS setup

With Namecheap, you can get multiple years of a DNS name. For whatever reason,
if you get > 1 year, unless you auto-renew, domain privacy protection is not
configured for more than one year. It's free to add years to privacy
protection, so make sure the end dates line up.

Set up a Catch-All to Redirect Email.

In Advanced DNS, add one `A` record, for the Host `@` and a Value of the IP
address you see from Linode. You can also add a `CNAME` with a `Host` of `www`
to point to your root domain.
