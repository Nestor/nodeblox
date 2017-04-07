const expect = require("chai").expect


describe("Roblox", () => {
    let roblox // global test object

    it("should initialize correctly", () => {
        let test_roblox = new Roblox({username: process.env.TEST_USERNAME, password: process.env.TEST_PASSWORD})
        expect(test_roblox).to.be.not.throw
        roblox = test_roblox
    })

    describe("Login", () => {
        it("should work", async () => {
            let login = await roblox.login()
            expect(login).to.be.true.and.not.throw
        })

        it("should set cookie", () => {
            expect(roblox.cookie).to.not.be.empty
        })
    })

    describe("User", () => {
        it("should be logged in", async () => {
            let logged = await roblox.fetchLoggedIn()
            expect(logged).to.be.true.and.not.throw
        })

        describe("Settings", () => {
            it("should not throw", async () => {
                let settings = await roblox.fetchSettings()
                expect(settings).to.not.throw
            })
        })
    })

    describe("Group", () => {
        it("should fetch group funds", async () => {
            let funds = await roblox.fetchGroupFunds(process.env.TEST_GROUP)
            expect(funds).to.not.throw
            expect(funds).to.be.a.number
        })

        describe("Join Requests", () => {
            it("should fetch them", async () => {
                let requests = await roblox.fetchGroupJoinRequests()
                expect(requests).to.not.throw
                console.log(requests)
            })

            it("should accept them", async () => {
                let accept = await roblox.acceptGroupJoinRequest()
            })
        })
    })
})