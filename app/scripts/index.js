/* global ethereum */
// Import the page's CSS. Webpack will know what to do with it.
import '../styles/app.css'

// Import libraries we need.
import Web3 from 'web3'
import contract from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import ballotArtifact from '../../build/contracts/Ballot.json'
import { networks } from './networks'

// Ballot is our usable abstraction, which we'll use through the code below.
const Ballot = contract(ballotArtifact)

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
let accounts
let account

var network

const App = {
  start: async function () {
    const self = this
    // This should actually be web3.eth.getChainId but MM compares networkId to chainId apparently
    web3.eth.net.getId(async function (err, networkId) {
      if (parseInt(networkId) < 1000) { // We're on testnet/
        network = networks[networkId]
      } else { // We're on ganache
        console.log('Using local ganache')
      }
      if (!network) {
        const fatalmessage = document.getElementById('fatalmessage')
        fatalmessage.innerHTML = "Wrong network. please switch to 'kovan' or 'ropsten' or 'rinkeby'"
        return
      }
      console.log('chainid=', networkId, network)

      if (err) {
        console.log('Error getting chainId', err)
        process.exit(-1)
      }

      // Bootstrap the Ballot abstraction for Use.
      Ballot.setProvider(web3.currentProvider)

      // Get the initial account balance so it can be displayed.
      web3.eth.getAccounts(function (err, accs) {
        if (err != null) {
          alert('There was an error fetching your accounts.')
          return
        }

        if (accs.length === 0) {
          alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
          return
        }

        accounts = accs
        account = accounts[0]

        self.refreshAccount()
      })
    })
  },

  refreshAccount: function() {
    const self = this

    const item = document.getElementById('address')
    item.innerHTML = self.addressLink(account)
  },

  createBallot: function() {
    const self = this

    const question = document.getElementById('question').value
    const option1 = document.getElementById('option1').value
    const option2 = document.getElementById('option2').value

    this.setDeployStatus('Creando nueva votación... (por favor aguarde)')

    let ballot
    Ballot.new(
      question,
      [
        Web3.utils.asciiToHex(option1),
        Web3.utils.asciiToHex(option2),
      ],
      {from: account},
    ).then(function (instance) {
      ballot = instance
      console.log('Deploy results:', instance)
      self.setDeployStatus(`¡Votación creada!<br>\n
      Dirección del Smart Contract: ${self.addressLink(ballot.address)}<br>\n
      Transacción: ${self.txLink(ballot.transactionHash)}`)
    }).catch(function (e) {
      console.log(e)
      self.setDeployStatus(`Error creando nueva votación; ver logs`)
    })
  },

  setDeployStatus: function (message) {
    const status = document.getElementById('deployStatus')
    status.innerHTML = message
  },

  setVoteStatus: function (message) {
    const status = document.getElementById('voteStatus')
    status.innerHTML = message
  },

  addressLink: function (addr) {
    return '<a href="' + network.addressUrl + addr + '" target="_info">' + addr + '</a>'
  },

  txLink: function (addr) {
    return '<a href="' + network.txUrl + addr + '" target="_info">' + addr + '</a>'
  },

  setOptionStatus: function (optionNumber, rawProposal) {
    console.log({rawProposal})
    const option = document.getElementById(`option${optionNumber + 1}name`)
    option.innerHTML = web3.utils.hexToAscii(rawProposal.name).replace(/\0/g, '')
    const count = document.getElementById(`option${optionNumber + 1}count`)
    count.innerHTML = rawProposal.voteCount.toString()
  },

  setQuestionTitleStatus: function (questionTitle) {
    const question = document.getElementById('questionTitle')
    question.innerHTML = questionTitle
  },

  fetchBallot: function () {
    const self = this

    const contractAddress = document.getElementById('existingBallot').value

    let existingBallot
    Ballot.at(contractAddress).then(function (instance) {
      existingBallot = instance

      existingBallot.question.call().then(function (r) {
        console.log(r)
        self.setQuestionTitleStatus(r)
      }).catch(function(e) {
        console.log(e)
      })

      existingBallot.proposals(0).then(function (r) {
        self.setOptionStatus(0, r)
      }).catch(function(e) {
        console.log(e)
      })

      existingBallot.proposals(1).then(function (r) {
        self.setOptionStatus(1, r)
      }).catch(function(e) {
        console.log(e)
      })
    }).then(function (r) {
      console.log(r)
    })
  },

  vote: function (optionNumber) {
    const self = this

    this.setVoteStatus('Votando... (por favor aguarde)')

    const contractAddress = document.getElementById('existingBallot').value

    let ballot
    Ballot.at(contractAddress).then(function (instance) {
      ballot = instance
      return ballot.vote(optionNumber, { from: account })
    }).then(function (res) {
      self.setVoteStatus('¡Transacción completa!<br>\n' + self.txLink(res.tx))
      self.fetchBallot()
    }).catch(function (e) {
      console.log(e)
      self.setVoteStatus(`Error al votar; ver logs`)
    })
  }

}

window.App = App
window.addEventListener('load', async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    console.warn(
      'Using web3 detected from external source.' +
      ' If you find that your accounts don\'t appear,' +
      ' ensure you\'ve configured that source properly.' +
      ' (and allowed the app to access MetaMask.)' +
      ' If using MetaMask, see the following link.' +
      ' Feel free to delete this warning. :)' +
      ' http://truffleframework.com/tutorials/truffle-and-metamask'
    )
    window.web3 = new Web3(ethereum)
    try {
      // Request account access if needed
      await ethereum.enable()

      ethereum.on('chainChanged', (chainId)=>{
        console.log( 'chainChanged', chainId)
        window.location.reload()
      })
      ethereum.on('accountsChanged', (accs)=>{
        console.log( 'accountChanged', accs)
        window.location.reload()
      })

    } catch (error) {
      // User denied account access...
      alert('NO NO NO')
    }
  } else if (window.web3) {
    // Legacy dapp browsers...
    window.web3 = new Web3(web3.currentProvider)
  } else {
    console.warn(
      'No web3 detected. Falling back to http://127.0.0.1:9545.' +
      ' You should remove this fallback when you deploy live, as it\'s inherently insecure.' +
      ' Consider switching to Metamask for development.' +
      ' More info here: http://truffleframework.com/tutorials/truffle-and-metamask'
    )
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545'))
  }
  await App.start()
})
